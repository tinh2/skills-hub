output "parameter_arns" {
  value = [for p in aws_ssm_parameter.params : p.arn]
}

output "env_vars" {
  description = "All environment variables for App Runner"
  value       = local.all_params
  sensitive   = true
}
