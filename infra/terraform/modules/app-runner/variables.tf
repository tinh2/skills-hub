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

variable "max_concurrency" {
  type    = number
  default = 100
}

variable "use_vpc" {
  description = "Enable VPC connector (requires NAT for internet access)"
  type        = bool
  default     = true
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "security_group_id" {
  type    = string
  default = ""
}

variable "s3_bucket_arn" {
  type = string
}

variable "env_vars" {
  description = "Runtime environment variables"
  type        = map(string)
  sensitive   = true
}

variable "custom_domain" {
  description = "Custom domain for the API (e.g. api.skills-hub.ai)"
  type        = string
  default     = ""
}
