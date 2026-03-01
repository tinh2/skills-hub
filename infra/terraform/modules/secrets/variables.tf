variable "environment" {
  type = string
}

# From infrastructure outputs
variable "db_endpoint" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "redis_connection_url" {
  type = string
}

variable "api_url" {
  type = string
}

variable "frontend_url" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}

# Sensitive inputs (from tfvars)
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
