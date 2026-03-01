# --- IAM: Access Role (ECR pull) ---

resource "aws_iam_role" "access" {
  name = "skills-hub-${var.environment}-web-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "access_ecr" {
  role       = aws_iam_role.access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- App Runner Service (Web) ---

resource "aws_apprunner_service" "web" {
  service_name = "skills-hub-web-${var.environment}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.access.arn
    }

    image_repository {
      image_identifier      = "${var.ecr_repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3001"
        runtime_environment_variables = {
          NEXT_PUBLIC_API_URL  = var.api_url
          NEXT_PUBLIC_SITE_URL = var.site_url
          NODE_ENV             = "production"
          HOSTNAME             = "0.0.0.0"
          PORT                 = "3001"
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.instance_cpu
    memory = var.instance_memory
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.web.arn

  tags = {
    Name = "skills-hub-web-${var.environment}"
  }
}

resource "aws_apprunner_auto_scaling_configuration_version" "web" {
  auto_scaling_configuration_name = "skills-hub-web-${var.environment}"

  min_size        = var.min_instances
  max_size        = var.max_instances
  max_concurrency = 100

  tags = {
    Name = "skills-hub-web-${var.environment}"
  }
}

# --- Custom Domain (optional) ---

resource "aws_apprunner_custom_domain_association" "web" {
  count = var.custom_domain != "" ? 1 : 0

  domain_name = var.custom_domain
  service_arn = aws_apprunner_service.web.arn
}
