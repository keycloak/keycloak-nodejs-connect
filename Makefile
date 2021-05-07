.PHONY: status up upMAX portainer restart down pull stop commands

status:
	docker ps -a --format "table {{.Names}}\t{{.ID}}\t{{.Status}}\t{{.Command}}\t{{.Ports}}"

USERNAME := $(shell whoami)

UP=docker-compose up -d

portainer:
	$(UP) portainer

up:
	$(UP) portainer keycloak_SA

upMAX:
	$(UP) portainer mysql adminer 
	sleep 10
	$(UP) keycloak

down:
	docker-compose down --remove-orphans --volumes

pull:
	docker-compose pull

stop:
	docker-compose stop

commands:
	@echo "================================================"
	@echo "make commands:                                  "
	@echo "    up        upMAX         down                "
	@echo "    pull      stop          status              "
	@echo "================================================"