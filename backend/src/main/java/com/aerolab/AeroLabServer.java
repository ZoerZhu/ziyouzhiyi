package com.aerolab;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

public final class AeroLabServer {
    private final SimulationEngine simulationEngine = new SimulationEngine();
    private final TeachingGuide teachingGuide = new TeachingGuide();

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8088;
        new AeroLabServer().start(port);
    }

    private void start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/health", exchange -> handleJson(exchange, "{\"status\":\"ok\",\"service\":\"AeroLab Java\"}"));
        server.createContext("/api/scenario/default", exchange -> handleJson(exchange, teachingGuide.scenarioJson()));
        server.createContext("/api/teaching/steps", exchange -> handleJson(exchange, teachingGuide.stepsJson()));
        server.createContext("/api/simulation/update", this::handleSimulationUpdate);
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
        System.out.println("AeroLab Java service is running at http://127.0.0.1:" + port);
    }

    private void handleSimulationUpdate(HttpExchange exchange) throws IOException {
        if (handleCorsPreflight(exchange)) {
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            send(exchange, 405, "{\"error\":\"POST required\"}");
            return;
        }
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        handleJson(exchange, simulationEngine.update(body));
    }

    private void handleJson(HttpExchange exchange, String json) throws IOException {
        if (handleCorsPreflight(exchange)) {
            return;
        }
        send(exchange, 200, json);
    }

    private boolean handleCorsPreflight(HttpExchange exchange) throws IOException {
        addCors(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return true;
        }
        return false;
    }

    private void send(HttpExchange exchange, int status, String json) throws IOException {
        addCors(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        byte[] payload = Json.bytes(json);
        exchange.sendResponseHeaders(status, payload.length);
        exchange.getResponseBody().write(payload);
        exchange.close();
    }

    private void addCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }
}
