# AeroLab Java Backend

轻量 Java HTTP 服务，提供教学步骤、默认场景和一次模拟更新接口。

## 启动

```powershell
javac -encoding UTF-8 -d out src/main/java/com/aerolab/*.java
java -cp out com.aerolab.AeroLabServer
```

默认地址：`http://127.0.0.1:8088`

## 接口

- `GET /api/health`
- `GET /api/scenario/default`
- `GET /api/teaching/steps`
- `POST /api/simulation/update`
