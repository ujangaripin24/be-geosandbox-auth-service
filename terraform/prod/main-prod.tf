terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ==============================================================================
# VARIABLES
# ==============================================================================
variable "aws_region" {
  description = "Region AWS untuk deployment"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Nama environment"
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "Tipe instance EC2 AWS"
  type        = string
  default     = "t3.small"
}

variable "app_port" {
  description = "Port aplikasi be-geosandbox-auth-service"
  type        = number
  default     = 3610
}

variable "ssh_key_name" {
  description = "Nama EC2 Key Pair (opsional, jika ingin akses SSH)"
  type        = string
  default     = ""
}

# ==============================================================================
# DATA SOURCES
# ==============================================================================
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"]
}

# ==============================================================================
# SECURITY GROUP
# ==============================================================================
resource "aws_security_group" "auth_service_sg" {
  name        = "be-geosandbox-auth-service-sg-${var.environment}"
  description = "Security Group untuk Geosandbox Auth Service"

  ingress {
    description = "Akses SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Port Aplikasi Auth Service"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description      = "Semua koneksi outbound"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "be-geosandbox-auth-service-sg-${var.environment}"
    Environment = var.environment
    Service     = "auth-service"
  }
}

# ==============================================================================
# EC2 INSTANCE & AUTOMATED PROVISIONING
# ==============================================================================
resource "aws_instance" "auth_service_instance" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  iam_instance_profile = "<isi disini>"

  vpc_security_group_ids = [aws_security_group.auth_service_sg.id]
  key_name               = var.ssh_key_name != "" ? var.ssh_key_name : null

  user_data_replace_on_change = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > >(tee /var/log/auth-data.log|logger -t auth-data -s 2>/dev/console) 2>&1

    echo "=== [1/6] Update System Packages ==="
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg git

    echo "=== [2/6] Install Docker & Docker Compose ==="
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo       "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu       $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |       tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu

    echo "=== [3/6] Setup App Directory & Checkout Branch prod ==="
    mkdir -p /home/ubuntu/app
    cd /home/ubuntu/app

    if [ -d ".git" ]; then
      git fetch origin prod
      git checkout prod
      git reset --hard origin/prod
    else
      git clone -b prod https://github.com/ujangaripin24/be-geosandbox-auth-service.git .
    fi

    echo "=== [4/6] Menulis file .env ==="
    echo "${fileexists("${path.module}/.env") ? base64encode(file("${path.module}/.env")) : ""}" | base64 -d > /home/ubuntu/app/.env

    echo "=== [5/6] Siapkan Docker Network ==="
    docker network create global-network-geosandbox || true

    echo "=== [6/6] Build & Jalankan Container ==="
    chown -R ubuntu:ubuntu /home/ubuntu/app
    docker compose down || true
    docker compose up -d --build

    echo "=== Deployment Selesai Berhasil! ==="
  EOF

  tags = {
    Name        = "be-geosandbox-auth-service-${var.environment}"
    Environment = var.environment
    Service     = "auth-service"
  }
}

# ==============================================================================
# OUTPUTS
# ==============================================================================
output "instance_id" {
  description = "ID EC2 Instance AWS"
  value       = aws_instance.auth_service_instance.id
}

output "public_ip" {
  description = "IP Publik EC2 Instance"
  value       = aws_instance.auth_service_instance.public_ip
}

output "application_url" {
  description = "URL Endpoint Aplikasi"
  value       = "http://${aws_instance.auth_service_instance.public_ip}:${var.app_port}"
}
