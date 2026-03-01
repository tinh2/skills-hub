variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "recipeai"
}

variable "use_vpc" {
  description = "Use VPC with NAT for private networking. false = no NAT, public RDS, no Redis (~$18/mo). true = full VPC (~$36/mo)."
  type        = bool
  default     = false
}

# Database
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

# Cache
variable "cache_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

# App Runner
variable "app_runner_cpu" {
  type    = string
  default = "0.25 vCPU"
}

variable "app_runner_memory" {
  type    = string
  default = "0.5 GB"
}

variable "app_runner_min_instances" {
  type    = number
  default = 1
}

variable "app_runner_max_instances" {
  type    = number
  default = 2
}

# URLs
variable "frontend_url" {
  type    = string
  default = "https://dev.skills-hub.ai"
}

variable "api_url" {
  description = "API URL (update after first deploy with App Runner URL)"
  type        = string
  default     = "https://api-dev.skills-hub.ai"
}

# Alerts
variable "alert_email" {
  type = string
}

# Secrets (sensitive — provide via tfvars or env)
variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "github_client_id" {
  type      = string
  sensitive = true
}

variable "github_client_secret" {
  type      = string
  sensitive = true
}

variable "github_token_encryption_key" {
  type      = string
  sensitive = true
}
