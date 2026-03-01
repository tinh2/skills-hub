output "service_url" {
  value = aws_apprunner_service.api.service_url
}

output "service_arn" {
  value = aws_apprunner_service.api.arn
}

output "service_name" {
  value = aws_apprunner_service.api.service_name
}

output "custom_domain_records" {
  description = "DNS records to configure in Cloudflare for custom domain"
  value       = var.custom_domain != "" ? aws_apprunner_custom_domain_association.api[0].certificate_validation_records : []
}
