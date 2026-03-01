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
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# --- Data Sources ---

data "aws_ecr_repository" "api" {
  name = "skills-hub/api"
}

data "aws_ecr_repository" "web" {
  name = "skills-hub/web"
}

# --- Network (VPC mode only) ---

module "network" {
  count  = var.use_vpc ? 1 : 0
  source = "../../modules/network"

  environment      = "dev"
  use_nat_instance = true # ~$3.50/mo vs $33/mo NAT Gateway
}

# --- Database ---
# Without VPC: public subnet, publicly accessible
# With VPC: private subnet, not publicly accessible

module "database" {
  source = "../../modules/database"

  environment             = "dev"
  instance_class          = var.db_instance_class
  multi_az                = false
  backup_retention_period = 1
  deletion_protection     = false
  publicly_accessible     = !var.use_vpc
  private_subnet_ids      = var.use_vpc ? module.network[0].private_subnet_ids : data.aws_subnets.default[0].ids
  security_group_id       = var.use_vpc ? module.network[0].sg_database_id : aws_security_group.database_public[0].id
}

# Default VPC resources (used when use_vpc = false)

data "aws_vpc" "default" {
  count   = var.use_vpc ? 0 : 1
  default = true
}

data "aws_subnets" "default" {
  count = var.use_vpc ? 0 : 1

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
}

resource "aws_security_group" "database_public" {
  count = var.use_vpc ? 0 : 1

  name_prefix = "skills-hub-dev-db-public-"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    description = "PostgreSQL from App Runner"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # App Runner IPs are dynamic; restrict further if possible
  }

  tags = {
    Name = "skills-hub-dev-database-public"
  }
}

# --- Cache (VPC mode only — without VPC, Fastify uses in-memory rate limiting) ---

module "cache" {
  count  = var.use_vpc ? 1 : 0
  source = "../../modules/cache"

  environment              = "dev"
  node_type                = var.cache_node_type
  snapshot_retention_limit = 0
  private_subnet_ids       = module.network[0].private_subnet_ids
  security_group_id        = module.network[0].sg_cache_id
}

# --- Storage ---

module "storage" {
  source = "../../modules/storage"

  environment     = "dev"
  allowed_origins = [var.frontend_url]
}

# --- Secrets ---

module "secrets" {
  source = "../../modules/secrets"

  environment                 = "dev"
  db_endpoint                 = module.database.endpoint
  db_name                     = module.database.db_name
  db_username                 = module.database.username
  db_password                 = module.database.password
  redis_connection_url        = var.use_vpc ? module.cache[0].connection_url : ""
  api_url                     = var.api_url
  frontend_url                = var.frontend_url
  s3_bucket_name              = module.storage.bucket_name
  jwt_secret                  = var.jwt_secret
  github_client_id            = var.github_client_id
  github_client_secret        = var.github_client_secret
  github_token_encryption_key = var.github_token_encryption_key
}

# --- App Runner ---

module "app_runner" {
  source = "../../modules/app-runner"

  environment        = "dev"
  ecr_repository_url = data.aws_ecr_repository.api.repository_url
  image_tag          = "dev"
  instance_cpu       = var.app_runner_cpu
  instance_memory    = var.app_runner_memory
  min_instances      = var.app_runner_min_instances
  max_instances      = var.app_runner_max_instances
  use_vpc            = var.use_vpc
  private_subnet_ids = var.use_vpc ? module.network[0].private_subnet_ids : []
  security_group_id  = var.use_vpc ? module.network[0].sg_app_runner_id : ""
  s3_bucket_arn      = module.storage.bucket_arn
  env_vars           = module.secrets.env_vars
}

# --- Web (Next.js frontend on App Runner) ---

module "web_runner" {
  source = "../../modules/web-runner"

  environment        = "dev"
  ecr_repository_url = data.aws_ecr_repository.web.repository_url
  image_tag          = "dev"
  instance_cpu       = "0.25 vCPU"
  instance_memory    = "0.5 GB"
  min_instances      = 1
  max_instances      = 2
  api_url            = var.api_url
  site_url           = var.frontend_url
}

# --- Monitoring ---

module "monitoring" {
  source = "../../modules/monitoring"

  environment             = "dev"
  alert_email             = var.alert_email
  log_retention_days      = 7
  rds_instance_id         = module.database.instance_id
  app_runner_service_name = module.app_runner.service_name
  elasticache_cluster_id  = var.use_vpc ? "skills-hub-dev" : ""
}
