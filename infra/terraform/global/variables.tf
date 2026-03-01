variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile"
  type        = string
  default     = "recipeai"
}

variable "github_repo" {
  description = "GitHub repository (org/repo)"
  type        = string
  default     = "tinh2/skills-hub"
}
