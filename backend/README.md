# BugTrack Backend

Backend del gestor de issues **BugTrack**. Esta es la **Fase 1**: un esqueleto mínimo de
Spring Boot cuyo único objetivo es arrancar y responder a un endpoint de salud, para
comprobar que el entorno de desarrollo está bien configurado.

Todavía no hay entidades, repositories, base de datos ni la feature de issues: eso llega
en la Fase 2.

## Requisitos

- **Java 21** (JDK, no solo JRE). Verificá con `java -version`.
- **Maven 3.9.x**. Verificá con `mvn -v`.

### Si `mvn` no está en el PATH

En macOS puede pasar que Maven esté instalado pero no sea visible para tu shell. Usá la
ruta completa o agregalo a tu PATH en cada terminal:

```bash
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"
# o bien
/Users/alejandra/apps/apache-maven-3.9.9/bin/mvn -v
```

## Cómo ejecutar

Desde el directorio `backend/`:

```bash
mvn spring-boot:run
```

La primera vez Maven descarga las dependencias y puede tardar varios minutos.

Para generar el jar:

```bash
mvn clean package
```

El servicio queda escuchando en el puerto **8080**.

## Cómo verificar

En otra terminal:

```bash
curl http://localhost:8080/api/health
```

Respuesta esperada:

```json
{"status":"UP"}
```
