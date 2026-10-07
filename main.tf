terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

data "docker_network" "local_network" {
  name = "global-network-geosandbox"
}

resource "docker_image" "app_image" {
  name = "be-geosandbox-auth-service:latest"
  build {
    context    = "."
    dockerfile = "Dockerfile"
    build_arg = {
      NODE_VERSION = "24.16.0"
    }
  }
}

resource "docker_container" "app" {
  name    = "auth_service_app"
  image   = docker_image.app_image.image_id
  restart = "always"
  command = ["npm", "run", "dev"]
  memory  = 536870912

  networks_advanced {
    name = data.docker_network.local_network.name
  }

  ports {
    internal = 3619
    external = 3619
  }

  volumes {
    host_path      = abspath(path.module)
    container_path = "/usr/src/app"
  }

  volumes {
    container_path = "/usr/src/app/node_modules"
  }

  env = [
    for line in compact(split("\n", file("${path.module}/.env"))) : line
    if !startswith(line, "#") && length(split("=", line)) > 1
  ]
}
