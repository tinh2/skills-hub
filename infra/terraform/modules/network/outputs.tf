output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "sg_app_runner_id" {
  value = aws_security_group.app_runner.id
}

output "sg_database_id" {
  value = aws_security_group.database.id
}

output "sg_cache_id" {
  value = aws_security_group.cache.id
}
