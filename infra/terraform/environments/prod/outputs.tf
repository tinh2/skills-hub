output "api_url" {
  value = "https://${module.app_runner.service_url}"
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "redis_endpoint" {
  value = module.cache.endpoint
}

output "s3_bucket" {
  value = module.storage.bucket_name
}

output "custom_domain_records" {
  description = "Add these DNS records in Cloudflare"
  value       = module.app_runner.custom_domain_records
}
