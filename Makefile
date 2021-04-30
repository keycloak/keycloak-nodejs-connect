.PHONY: status up upALL portainer restart down pull stop commands

status:
	docker ps -a --format "table {{.Names}}\t{{.ID}}\t{{.Status}}\t{{.Command}}\t{{.Ports}}"

USERNAME := $(shell whoami)

UP=docker-compose up -d

portainer:
	$(UP) portainer


up:
	$(UP) portainer mysql adminer 
	sleep 10
	$(UP) keycloak


upALL:
	$(UP) portainer mysql adminer 
	sleep 10
	$(UP) keycloak

upMin:
	$(UP) mysql
	sleep 10
	$(UP) keycloak

restart:
	docker-compose stop
	docker-compose start mongo mariadb
	sleep 1
	docker-compose start rest-service
	sleep 1
	docker-compose start portainer

down:
	docker-compose down --remove-orphans --volumes

pull:
	docker-compose pull

stop:
	docker-compose stop

commands:
	@echo "================================================"
	@echo "make commands:                                  "
	@echo "    up                 down                     "
	@echo "    restart            pull                     "
	@echo "    stop               status                   "
	@echo "================================================"