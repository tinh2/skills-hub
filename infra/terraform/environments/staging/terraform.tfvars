# Environment sizing
db_instance_class        = "db.t4g.micro"
cache_node_type          = "cache.t4g.micro"
app_runner_cpu           = "0.25 vCPU"
app_runner_memory        = "0.5 GB"
app_runner_min_instances = 1
app_runner_max_instances = 2
frontend_url             = "https://staging.skills-hub.ai"
api_url                  = "https://api-staging.skills-hub.ai"
alert_email              = "support@teambearie.com"

# Secrets — FILL THESE IN, do NOT commit to git
# jwt_secret                  = ""
# github_client_id            = ""
# github_client_secret        = ""
# github_token_encryption_key = ""
