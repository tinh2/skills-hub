data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

# --- VPC ---

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "skills-hub-${var.environment}"
  }
}

# --- Internet Gateway ---

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "skills-hub-${var.environment}-igw"
  }
}

# --- Public Subnets ---

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 100 + count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "skills-hub-${var.environment}-public-${local.azs[count.index]}"
  }
}

# --- Private Subnets ---

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "skills-hub-${var.environment}-private-${local.azs[count.index]}"
  }
}

# --- NAT Gateway (prod/staging) or NAT Instance (dev) ---

resource "aws_eip" "nat" {
  count  = var.use_nat_instance ? 0 : 1
  domain = "vpc"

  tags = {
    Name = "skills-hub-${var.environment}-nat"
  }
}

resource "aws_nat_gateway" "main" {
  count = var.use_nat_instance ? 0 : 1

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "skills-hub-${var.environment}-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Instance (cheaper alternative for dev: ~$3.50/mo vs $33/mo)
data "aws_ami" "nat" {
  count       = var.use_nat_instance ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn-ami-vpc-nat-*-x86_64-ebs"]
  }
}

resource "aws_instance" "nat" {
  count = var.use_nat_instance ? 1 : 0

  ami                    = data.aws_ami.nat[0].id
  instance_type          = "t3.nano"
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.nat[0].id]
  source_dest_check      = false

  tags = {
    Name = "skills-hub-${var.environment}-nat-instance"
  }
}

resource "aws_security_group" "nat" {
  count = var.use_nat_instance ? 1 : 0

  name_prefix = "skills-hub-${var.environment}-nat-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [for s in aws_subnet.private : s.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "skills-hub-${var.environment}-nat"
  }
}

# --- Route Tables ---

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "skills-hub-${var.environment}-public"
  }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "skills-hub-${var.environment}-private"
  }
}

resource "aws_route" "private_nat_gateway" {
  count = var.use_nat_instance ? 0 : 1

  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[0].id
}

resource "aws_route" "private_nat_instance" {
  count = var.use_nat_instance ? 1 : 0

  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat[0].primary_network_interface_id
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- Security Groups ---

resource "aws_security_group" "app_runner" {
  name_prefix = "skills-hub-${var.environment}-apprunner-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "skills-hub-${var.environment}-app-runner"
  }
}

resource "aws_security_group" "database" {
  name_prefix = "skills-hub-${var.environment}-db-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner.id]
  }

  tags = {
    Name = "skills-hub-${var.environment}-database"
  }
}

resource "aws_security_group" "cache" {
  name_prefix = "skills-hub-${var.environment}-cache-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner.id]
  }

  tags = {
    Name = "skills-hub-${var.environment}-cache"
  }
}
