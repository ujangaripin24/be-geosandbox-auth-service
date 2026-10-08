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
  name         = "be-geosandbox-auth-service:latest"
  keep_locally = true

  triggers = {
    dir_sha1 = sha1(join("", [
      for f in sort(setunion(
        fileset("${path.module}/../..", "src/**"),
        fileset("${path.module}/../..", "package*.json"),
        fileset("${path.module}/../..", "Dockerfile")
      )) : filesha1("${path.module}/../../${f}")
    ]))
  }

  build {
    context    = abspath("${path.module}/../..")
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
  command = ["npm", "start"]

  # 512 * 1024 * 1024 = 536870912
  memory = 536870912

  networks_advanced {
    name = data.docker_network.local_network.name
  }

  env = [
    for line in compact(split("\n", fileexists("${path.module}/.env") ? file("${path.module}/.env") : "")) : line
    if !startswith(line, "#") && length(split("=", line)) > 1
  ]
}
