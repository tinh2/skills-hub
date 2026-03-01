variable "environment" {
  type = string
}

variable "alert_email" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 7
}

variable "rds_instance_id" {
  type = string
}

variable "app_runner_service_name" {
  type = string
}

variable "elasticache_cluster_id" {
  type = string
}
