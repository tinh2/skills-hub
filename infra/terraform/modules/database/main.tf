resource "random_password" "master" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "skills-hub/${var.environment}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.master.result
}

resource "aws_db_subnet_group" "main" {
  name       = "skills-hub-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "skills-hub-${var.environment}"
  }
}

resource "aws_db_parameter_group" "main" {
  name_prefix = "skills-hub-${var.environment}-"
  family      = "postgres16"

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "skills-hub-${var.environment}"
  }
}

resource "aws_db_instance" "main" {
  identifier = "skills-hub-${var.environment}"

  engine         = "postgres"
  engine_version = "16.6"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "skillshub"
  username = "skillshub_admin"
  password = random_password.master.result

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  parameter_group_name   = aws_db_parameter_group.main.name
  publicly_accessible    = var.publicly_accessible

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  performance_insights_enabled = true
  deletion_protection          = var.deletion_protection
  skip_final_snapshot          = var.environment == "dev"
  final_snapshot_identifier    = var.environment == "dev" ? null : "skills-hub-${var.environment}-final"

  tags = {
    Name = "skills-hub-${var.environment}"
  }
}
