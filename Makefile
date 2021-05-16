.PHONY: status up up2 upMAX down downMAX stop stopMAX commandsdocker-compose 

status:
	docker ps -a --format "table {{.Names}}\t{{.ID}}\t{{.Status}}\t{{.Command}}\t{{.Ports}}"

UP=docker-compose up -d
UP_FULL=docker-compose -f docker-compose-keycloak-mysql.yml up -d 

up:
	$(UP) keycloak_SA

up2:
	$(UP) keycloak_SA portainer


upMAX:
	$(UP_FULL) portainer mysql adminer 
	sleep 10
	$(UP_FULL) keycloak

down:
	docker-compose down --remove-orphans --volumes

downMAX:
	docker-compose -f docker-compose-keycloak-mysql.yml down --remove-orphans --volumes

stop:
	docker-compose stop

stopMAX:
	docker-compose -f docker-compose-keycloak-mysql.yml  stop

commands:
	@echo "==================================================="
	@echo "Common make commands :                             "
	@echo "                                                   "
	@echo "    status                                         "
	@echo "make commands for Keycloaknon MYSQL configuration: "
	@echo "    up        up2        down        stop          "
	@echo "                                                   "
	@echo "make commands for Keycloak MYSQL configuration:    "
	@echo "    upMAX          downMAX          stopMAX        "
	@echo "-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  "
	@echo " Notes:                                            "
	@echo " 1) up2 starts Keycloak and Portainer              "
	@echo "==================================================="
	