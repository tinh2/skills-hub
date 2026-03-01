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
      Environment = "staging"
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

  environment      = "staging"
  use_nat_instance = true # NAT instance ~$3.50/mo vs gateway ~$33/mo
}

module "database" {
  source = "../../modules/database"

  environment             = "staging"
  instance_class          = var.db_instance_class
  multi_az                = false
  backup_retention_period = 7
  deletion_protection     = false
  private_subnet_ids      = module.network.private_subnet_ids
  security_group_id       = module.network.sg_database_id
}

module "cache" {
  source = "../../modules/cache"

  environment              = "staging"
  node_type                = var.cache_node_type
  snapshot_retention_limit  = 1
  private_subnet_ids       = module.network.private_subnet_ids
  security_group_id        = module.network.sg_cache_id
}

module "storage" {
  source = "../../modules/storage"

  environment     = "staging"
  allowed_origins = [var.frontend_url]
}

module "secrets" {
  source = "../../modules/secrets"

  environment                 = "staging"
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

  environment        = "staging"
  ecr_repository_url = data.aws_ecr_repository.api.repository_url
  image_tag          = "staging"
  instance_cpu       = var.app_runner_cpu
  instance_memory    = var.app_runner_memory
  min_instances      = var.app_runner_min_instances
  max_instances      = var.app_runner_max_instances
  private_subnet_ids = module.network.private_subnet_ids
  security_group_id  = module.network.sg_app_runner_id
  s3_bucket_arn      = module.storage.bucket_arn
  env_vars           = module.secrets.env_vars
}

module "web_runner" {
  source = "../../modules/web-runner"

  environment        = "staging"
  ecr_repository_url = data.aws_ecr_repository.web.repository_url
  image_tag          = "staging"
  instance_cpu       = "0.25 vCPU"
  instance_memory    = "0.5 GB"
  min_instances      = 1
  max_instances      = 2
  api_url            = var.api_url
  site_url           = var.frontend_url
}

module "monitoring" {
  source = "../../modules/monitoring"

  environment             = "staging"
  alert_email             = var.alert_email
  log_retention_days      = 30
  rds_instance_id         = module.database.instance_id
  app_runner_service_name = module.app_runner.service_name
  elasticache_cluster_id  = "skills-hub-staging"
}
