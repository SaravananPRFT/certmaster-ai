terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-certmaster-infra"
    storage_account_name = "certmasterstate"
    container_name       = "tfstate"
    key                  = "certmaster.tfstate"
  }
}

provider "azurerm" {
  features {}
}

variable "env" {
  default = "prod"
}

variable "location" {
  default = "eastus"
}

locals {
  prefix = "certmaster-${var.env}"
  tags = {
    project     = "CertMasterAI"
    environment = var.env
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

# Azure AI Search (Standard tier for semantic search)
resource "azurerm_search_service" "main" {
  name                = "search-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "standard"
  replica_count       = 1
  partition_count     = 1
  tags                = local.tags
}

# Azure OpenAI Service
resource "azurerm_cognitive_account" "openai" {
  name                = "openai-${local.prefix}"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.main.name
  kind                = "OpenAI"
  sku_name            = "S0"
  tags                = local.tags
}

# Azure OpenAI Deployments
resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "gpt-4o"
    version = "2024-08-06"
  }
  scale {
    type     = "Standard"
    capacity = 80
  }
}

resource "azurerm_cognitive_deployment" "embedding" {
  name                 = "text-embedding-3-large"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "text-embedding-3-large"
    version = "1"
  }
  scale {
    type     = "Standard"
    capacity = 120
  }
}

# Azure Storage
resource "azurerm_storage_account" "main" {
  name                     = "certmasterstore${var.env}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.tags
}

resource "azurerm_storage_container" "docs" {
  name                  = "certmaster-docs"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = "redis-${local.prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  tags                = local.tags
}

# Azure App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "asp-${local.prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "P2v3"
  tags                = local.tags
}

# Backend API (FastAPI)
resource "azurerm_linux_web_app" "api" {
  name                = "api-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  tags                = local.tags

  site_config {
    application_stack {
      python_version = "3.12"
    }
    startup_command = "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"
  }

  app_settings = {
    AZURE_SEARCH_ENDPOINT                 = "https://${azurerm_search_service.main.name}.search.windows.net"
    AZURE_SEARCH_KEY                      = azurerm_search_service.main.primary_key
    AZURE_SEARCH_INDEX                    = "certmaster-docs"
    AZURE_OPENAI_ENDPOINT                 = azurerm_cognitive_account.openai.endpoint
    AZURE_OPENAI_KEY                      = azurerm_cognitive_account.openai.primary_access_key
    AZURE_OPENAI_DEPLOYMENT               = "gpt-4o"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT     = "text-embedding-3-large"
    AZURE_STORAGE_CONNECTION_STRING       = azurerm_storage_account.main.primary_connection_string
    REDIS_URL                             = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380"
    WEBSITES_PORT                         = "8000"
    SCM_DO_BUILD_DURING_DEPLOYMENT        = "true"
  }
}

# Frontend (Next.js)
resource "azurerm_linux_web_app" "frontend" {
  name                = "web-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  tags                = local.tags

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    startup_command = "node .next/standalone/server.js"
  }

  app_settings = {
    NEXT_PUBLIC_API_URL     = "https://api-${local.prefix}.azurewebsites.net/api/v1"
    WEBSITES_PORT           = "3000"
    NODE_ENV                = "production"
  }
}

# Azure Monitor (Application Insights)
resource "azurerm_application_insights" "main" {
  name                = "appi-${local.prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  tags                = local.tags
}

output "api_url" {
  value = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "frontend_url" {
  value = "https://${azurerm_linux_web_app.frontend.default_hostname}"
}

output "search_endpoint" {
  value = "https://${azurerm_search_service.main.name}.search.windows.net"
}
