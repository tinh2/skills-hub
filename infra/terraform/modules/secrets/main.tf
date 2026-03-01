locals {
  database_url = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${var.db_endpoint}/${var.db_name}?schema=public&connection_limit=20&pool_timeout=10"

  # Computed parameters (from infrastructure outputs)
  computed_params = {
    DATABASE_URL         = local.database_url
    GITHUB_CALLBACK_URL  = "${var.frontend_url}/auth/callback"
    API_URL              = var.api_url
    FRONTEND_URL         = var.frontend_url
    S3_BUCKET_NAME       = var.s3_bucket_name
    NODE_ENV             = "production"
    HOST                 = "0.0.0.0"
    PORT                 = "3000"
  }

  # Only include REDIS_URL when Redis is actually available (Zod validates it as .url().optional())
  redis_params = var.redis_connection_url != "" ? { REDIS_URL = var.redis_connection_url } : {}

  # Sensitive parameters (provided at apply time)
  sensitive_params = {
    JWT_SECRET                  = var.jwt_secret
    GITHUB_CLIENT_ID            = var.github_client_id
    GITHUB_CLIENT_SECRET        = var.github_client_secret
    GITHUB_TOKEN_ENCRYPTION_KEY = var.github_token_encryption_key
  }

  all_params = merge(local.computed_params, local.redis_params, local.sensitive_params)
}

resource "aws_ssm_parameter" "params" {
  for_each = local.all_params

  name  = "/skills-hub/${var.environment}/${each.key}"
  type  = contains(keys(local.sensitive_params), each.key) ? "SecureString" : "String"
  value = each.value

  tags = {
    Environment = var.environment
  }
}
