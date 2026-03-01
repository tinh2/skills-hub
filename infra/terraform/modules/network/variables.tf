variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "use_nat_instance" {
  description = "Use a NAT instance instead of NAT Gateway (cheaper for dev)"
  type        = bool
  default     = false
}
