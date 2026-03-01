variable "environment" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "instance_cpu" {
  type    = string
  default = "0.25 vCPU"
}

variable "instance_memory" {
  type    = string
  default = "0.5 GB"
}

variable "min_instances" {
  type    = number
  default = 1
}

variable "max_instances" {
  type    = number
  default = 2
}

variable "api_url" {
  description = "Backend API URL (NEXT_PUBLIC_API_URL)"
  type        = string
}

variable "site_url" {
  description = "Public site URL (NEXT_PUBLIC_SITE_URL)"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain (e.g. skills-hub.ai)"
  type        = string
  default     = ""
}
