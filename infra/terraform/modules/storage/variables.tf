variable "environment" {
  type = string
}

variable "allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
}
