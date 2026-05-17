package com.aerolab;

final class TeachingGuide {
    String stepsJson() {
        return """
                [
                  {
                    "id": 1,
                    "title": "加速滑跑",
                    "goal": "把油门推到 70% 以上，观察推力如何让速度上升。",
                    "hint": "推力大于阻力时，飞机会沿跑道加速。"
                  },
                  {
                    "id": 2,
                    "title": "建立升力",
                    "goal": "当速度超过 28 m/s，把迎角调到 6° 到 9°。",
                    "hint": "迎角提高会让机翼上下表面的压力差更明显。"
                  },
                  {
                    "id": 3,
                    "title": "离地爬升",
                    "goal": "保持升力大于重力，让高度稳定增加。",
                    "hint": "爬升阶段不要急着收油门，也不要把迎角拉得太大。"
                  },
                  {
                    "id": 4,
                    "title": "进入巡航",
                    "goal": "收起起落架，降低襟翼，调整到较小迎角。",
                    "hint": "巡航需要让升力接近重力、推力接近阻力。"
                  },
                  {
                    "id": 5,
                    "title": "柔和降落",
                    "goal": "放下起落架和襟翼，降低油门，让垂直速度变为小负值。",
                    "hint": "降落不是直接下坠，而是用速度和升力控制下降率。"
                  }
                ]
                """;
    }

    String scenarioJson() {
        return """
                {
                  "name": "基础起飞-巡航-降落实验",
                  "aircraft": "轻型单发教学机",
                  "massKg": 1200,
                  "wingAreaM2": 16.2,
                  "recommended": {
                    "takeoffThrottle": 78,
                    "takeoffAngle": 7,
                    "cruiseThrottle": 52,
                    "cruiseAngle": 4,
                    "landingThrottle": 28,
                    "landingAngle": 5
                  }
                }
                """;
    }
}
