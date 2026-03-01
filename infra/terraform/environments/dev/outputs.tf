output "api_url" {
  value = "https://${module.app_runner.service_url}"
}

output "web_url" {
  value = "https://${module.web_runner.service_url}"
}

output "web_custom_domain_records" {
  description = "Add these DNS records in Cloudflare for the web frontend"
  value       = module.web_runner.custom_domain_records
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "redis_endpoint" {
  value = var.use_vpc ? module.cache[0].endpoint : "n/a (in-memory rate limiting)"
}

output "s3_bucket" {
  value = module.storage.bucket_name
}

output "custom_domain_records" {
  description = "Add these DNS records in Cloudflare"
  value       = module.app_runner.custom_domain_records
}
