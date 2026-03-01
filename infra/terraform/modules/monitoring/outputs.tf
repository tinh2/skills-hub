output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.api.name
}
