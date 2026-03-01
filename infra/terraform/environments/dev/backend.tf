terraform {
  backend "s3" {
    bucket         = "skills-hub-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "skills-hub-terraform-locks"
    encrypt        = true
    profile        = "recipeai"
  }
}
