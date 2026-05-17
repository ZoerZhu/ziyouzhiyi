package com.aerolab;

import static java.lang.Math.abs;
import static java.lang.Math.exp;
import static java.lang.Math.max;
import static java.lang.Math.min;
import static java.lang.Math.pow;
import static java.lang.Math.sin;
import static java.lang.Math.toRadians;

final class SimulationEngine {
    private static final double MASS_KG = 1_200.0;
    private static final double GRAVITY = 9.81;
    private static final double WING_AREA = 16.2;
    private static final double MAX_THRUST = 5_400.0;

    String update(String requestBody) {
        double deltaSeconds = clamp(Json.number(requestBody, "deltaSeconds", 0.12), 0.02, 0.35);
        double throttle = clamp(Json.number(requestBody, "throttle", 45.0), 0.0, 100.0);
        double angleOfAttack = clamp(Json.number(requestBody, "angleOfAttack", 5.0), -4.0, 18.0);
        double flaps = clamp(Json.number(requestBody, "flaps", 1.0), 0.0, 2.0);
        boolean gearDown = Json.bool(requestBody, "gearDown", true);
        boolean windShear = Json.bool(requestBody, "windShear", false);
        double wind = clamp(Json.number(requestBody, "wind", 4.0), -15.0, 22.0);

        double speed = clamp(Json.number(requestBody, "speed", 0.0), 0.0, 125.0);
        double altitude = max(0.0, Json.number(requestBody, "altitude", 0.0));
        double distance = max(0.0, Json.number(requestBody, "distance", 0.0));
        double verticalSpeed = clamp(Json.number(requestBody, "verticalSpeed", 0.0), -12.0, 14.0);
        double elapsed = max(0.0, Json.number(requestBody, "elapsed", 0.0));

        elapsed += deltaSeconds;
        double gust = windShear ? sin(elapsed * 2.3) * 9.0 + sin(elapsed * 5.1) * 3.0 : 0.0;
        double airspeed = max(0.0, speed + wind + gust);
        double airDensity = 1.225 * exp(-altitude / 8_500.0);
        double flapLiftBonus = flaps == 0 ? 0.0 : flaps == 1 ? 0.22 : 0.42;
        double stallStart = 14.0 - flaps * 0.65;
        double stallRisk = clamp((angleOfAttack - stallStart) / 5.0, 0.0, 1.0);

        double liftCoefficient = 0.24 + angleOfAttack * 0.095 + flapLiftBonus;
        liftCoefficient *= 1.0 - stallRisk * 0.56;

        double dragCoefficient = 0.028
                + pow(max(angleOfAttack, 0.0), 2.0) * 0.0017
                + flaps * 0.028
                + (gearDown ? 0.035 : 0.0)
                + stallRisk * 0.12;

        double lift = 0.5 * airDensity * airspeed * airspeed * WING_AREA * liftCoefficient;
        double drag = 0.5 * airDensity * airspeed * airspeed * WING_AREA * dragCoefficient;
        double thrust = MAX_THRUST * throttle / 100.0;
        double weight = MASS_KG * GRAVITY;

        boolean onGround = altitude <= 0.05;
        double rollingDrag = onGround ? weight * (gearDown ? 0.034 : 0.055) : 0.0;
        double acceleration = (thrust - drag - rollingDrag) / MASS_KG;
        speed = clamp(speed + acceleration * deltaSeconds, 0.0, 125.0);

        boolean canFly = altitude > 0.1 || (lift > weight * 0.96 && speed > 27.0);
        if (canFly) {
            double verticalAcceleration = ((lift - weight) / MASS_KG) * 0.55;
            verticalAcceleration += sin(toRadians(angleOfAttack - 4.0)) * 2.2;
            if (throttle < 25.0) {
                verticalAcceleration -= 0.65;
            }
            if (stallRisk > 0.55) {
                verticalAcceleration -= stallRisk * 4.4;
            }
            verticalSpeed = clamp(verticalSpeed + verticalAcceleration * deltaSeconds, -10.0, 12.0);
        } else {
            verticalSpeed = 0.0;
        }

        altitude += verticalSpeed * deltaSeconds;
        if (altitude < 0.0) {
            altitude = 0.0;
            verticalSpeed = 0.0;
        }
        distance += speed * deltaSeconds;
        double pitch = clamp(angleOfAttack * 0.55 + verticalSpeed * 1.7, -9.0, 18.0);

        String phase = phaseFor(altitude, speed, verticalSpeed, throttle, stallRisk);
        String feedback = feedbackFor(phase, lift, weight, thrust, drag, angleOfAttack, throttle, gearDown);

        return "{"
                + "\"elapsed\":" + fmt(elapsed) + ","
                + "\"speed\":" + fmt(speed) + ","
                + "\"airspeed\":" + fmt(airspeed) + ","
                + "\"altitude\":" + fmt(altitude) + ","
                + "\"distance\":" + fmt(distance) + ","
                + "\"verticalSpeed\":" + fmt(verticalSpeed) + ","
                + "\"pitch\":" + fmt(pitch) + ","
                + "\"lift\":" + fmt(lift) + ","
                + "\"drag\":" + fmt(drag) + ","
                + "\"thrust\":" + fmt(thrust) + ","
                + "\"weight\":" + fmt(weight) + ","
                + "\"stallRisk\":" + fmt(stallRisk) + ","
                + "\"phase\":\"" + Json.escape(phase) + "\","
                + "\"feedback\":\"" + Json.escape(feedback) + "\""
                + "}";
    }

    private String phaseFor(double altitude, double speed, double verticalSpeed, double throttle, double stallRisk) {
        if (stallRisk > 0.72 && altitude > 5.0) {
            return "失速风险";
        }
        if (altitude <= 0.2 && speed < 25.0) {
            return "地面滑跑";
        }
        if (altitude <= 0.5 && speed >= 25.0) {
            return "抬轮临界";
        }
        if (altitude <= 1.2 && speed < 32.0 && throttle < 35.0) {
            return "着陆";
        }
        if (verticalSpeed > 1.2 && altitude < 260.0) {
            return "爬升";
        }
        if (verticalSpeed < -1.2 && altitude > 2.0) {
            return "进近";
        }
        if (altitude > 70.0 && abs(verticalSpeed) < 1.25) {
            return "巡航";
        }
        return "姿态调整";
    }

    private String feedbackFor(
            String phase,
            double lift,
            double weight,
            double thrust,
            double drag,
            double angleOfAttack,
            double throttle,
            boolean gearDown
    ) {
        if ("失速风险".equals(phase)) {
            return "迎角偏大，机翼气流开始分离。请略微压低机头并增加速度。";
        }
        if (lift < weight * 0.82) {
            return "升力仍小于重力，飞机需要更高速度或更合适的迎角。";
        }
        if (thrust < drag) {
            return "阻力已经超过推力，飞机会逐渐减速。";
        }
        if (angleOfAttack > 12.5) {
            return "迎角能增加升力，但过大时会快速增加阻力。";
        }
        if (!gearDown && "地面滑跑".equals(phase)) {
            return "起落架收起会降低地面稳定性，起飞前请保持放下。";
        }
        if (throttle > 70.0 && lift > weight) {
            return "升力超过重力，飞机具备离地和爬升条件。";
        }
        return "保持平稳输入，观察四种力的大小关系如何改变飞行状态。";
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String fmt(double value) {
        return String.format(java.util.Locale.US, "%.3f", value);
    }
}
