# Lean mode — no VPC, no NAT, no Redis (~$11/mo)
# Set use_vpc = true when you have paying users (~$136/mo)
use_vpc                  = false

# Environment sizing
db_instance_class        = "db.t4g.micro"
cache_node_type          = "cache.t4g.micro"
app_runner_cpu           = "0.25 vCPU"
app_runner_memory        = "0.5 GB"
app_runner_min_instances = 1
app_runner_max_instances = 2
frontend_url             = "https://skills-hub.ai"
api_url                  = "https://api.skills-hub.ai"
alert_email              = "support@teambearie.com"
