# Environment sizing — production
db_instance_class        = "db.t4g.small"
cache_node_type          = "cache.t4g.small"
app_runner_cpu           = "1 vCPU"
app_runner_memory        = "2 GB"
app_runner_min_instances = 2
app_runner_max_instances = 10
frontend_url             = "https://skills-hub.ai"
api_url                  = "https://api.skills-hub.ai"
alert_email              = "support@teambearie.com"

# Secrets — FILL THESE IN, do NOT commit to git
# jwt_secret                  = ""
# github_client_id            = ""
# github_client_secret        = ""
# github_token_encryption_key = ""
