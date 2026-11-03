import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { catalogue } from "../src/data/catalogue";
import { questions } from "../src/data/questions";
import { uiLesson } from "../src/data/uiLesson";

// 验证学习入口的连通性：页面、源码与题库不能因多人修改元数据而悄悄断开。
describe("学习目录与真实源码", () => {
    it("专题与题目有稳定且唯一的ID，回答和跳转完整", () => {
        // ID 既用于列表身份也用于学习记录；重复 ID 会让收藏/完成状态串到另一条内容上。
        expect(new Set(catalogue.map((v) => v.id)).size).toBe(catalogue.length);
        expect(new Set(questions.map((v) => v.id)).size).toBe(questions.length);
        expect(questions.length).toBeGreaterThanOrEqual(70);
        for (const q of questions) {
            expect(typeof q.question).toBe("string");
            expect(q.answer?.length).toBeGreaterThan(10);
            expect(q.path).toMatch(/^\//);
        }
    });
    it("源码入口指向真实文件，避免阅读页显示不存在的伪代码路径", () => {
        const lessons = [...catalogue, uiLesson];
        for (const lesson of lessons) {
            if (!lesson.source) continue;
            const paths = Array.isArray(lesson.source) ? lesson.source : [lesson.source];
            for (const path of paths) expect(existsSync(resolve(path)), path).toBe(true);
        }
    });
});
