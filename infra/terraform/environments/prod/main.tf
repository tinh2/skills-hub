terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "skills-hub"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

data "aws_ecr_repository" "api" {
  name = "skills-hub/api"
}

data "aws_ecr_repository" "web" {
  name = "skills-hub/web"
}

module "network" {
  source = "../../modules/network"

  environment      = "prod"
  use_nat_instance = false # Use NAT Gateway for HA in prod
}

module "database" {
  source = "../../modules/database"

  environment             = "prod"
  instance_class          = var.db_instance_class
  multi_az                = true
  backup_retention_period = 14
  deletion_protection     = true
  private_subnet_ids      = module.network.private_subnet_ids
  security_group_id       = module.network.sg_database_id
}

module "cache" {
  source = "../../modules/cache"

  environment              = "prod"
  node_type                = var.cache_node_type
  snapshot_retention_limit  = 3
  private_subnet_ids       = module.network.private_subnet_ids
  security_group_id        = module.network.sg_cache_id
}

module "storage" {
  source = "../../modules/storage"

  environment     = "prod"
  allowed_origins = [var.frontend_url, "https://www.skills-hub.ai"]
}

module "secrets" {
  source = "../../modules/secrets"

  environment                 = "prod"
  db_endpoint                 = module.database.endpoint
  db_name                     = module.database.db_name
  db_username                 = module.database.username
  db_password                 = module.database.password
  redis_connection_url        = module.cache.connection_url
  api_url                     = var.api_url
  frontend_url                = var.frontend_url
  s3_bucket_name              = module.storage.bucket_name
  jwt_secret                  = var.jwt_secret
  github_client_id            = var.github_client_id
  github_client_secret        = var.github_client_secret
  github_token_encryption_key = var.github_token_encryption_key
}

module "app_runner" {
  source = "../../modules/app-runner"

  environment        = "prod"
  ecr_repository_url = data.aws_ecr_repository.api.repository_url
  image_tag          = "prod"
  instance_cpu       = var.app_runner_cpu
  instance_memory    = var.app_runner_memory
  min_instances      = var.app_runner_min_instances
  max_instances      = var.app_runner_max_instances
  private_subnet_ids = module.network.private_subnet_ids
  security_group_id  = module.network.sg_app_runner_id
  s3_bucket_arn      = module.storage.bucket_arn
  env_vars           = module.secrets.env_vars
  custom_domain      = "api.skills-hub.ai"
}

module "web_runner" {
  source = "../../modules/web-runner"

  environment        = "prod"
  ecr_repository_url = data.aws_ecr_repository.web.repository_url
  image_tag          = "prod"
  instance_cpu       = "0.25 vCPU"
  instance_memory    = "0.5 GB"
  min_instances      = 2
  max_instances      = 5
  api_url            = var.api_url
  site_url           = var.frontend_url
  custom_domain      = "skills-hub.ai"
}

module "monitoring" {
  source = "../../modules/monitoring"

  environment             = "prod"
  alert_email             = var.alert_email
  log_retention_days      = 90
  rds_instance_id         = module.database.instance_id
  app_runner_service_name = module.app_runner.service_name
  elasticache_cluster_id  = "skills-hub-prod"
}
