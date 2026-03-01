resource "aws_elasticache_subnet_group" "main" {
  name       = "skills-hub-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_cluster" "main" {
  cluster_id = "skills-hub-${var.environment}"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = var.snapshot_retention_limit

  transit_encryption_enabled = true

  tags = {
    Name = "skills-hub-${var.environment}"
  }
}
