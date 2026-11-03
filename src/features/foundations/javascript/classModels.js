/**
 * 类与继承实验使用的普通模型，故意与 Vue 的代理状态分开，便于观察真实对象身份。
 * class 仍采用原型机制；原型方法、实例字段、静态成员与私有成员不是同一种存储/访问方式。
 * 这些模型用于语言实验，业务工作台另用普通可序列化数据，不能把 JSON 当成模型实例的完整快照。
 */
export class Task {
    #status = "待学习"; // ES2022：不是普通可枚举属性。
    // static 成员属于构造器，可以沿子类构造器继承；不会成为每个实例自己的字段。
    static category = "学习任务";

    constructor(title) {
        // 每次 new 都创建实例自己的 title；相比之下，下面的普通方法位于 Task.prototype。
        this.title = title;
    }
    get label() {
        // getter 像属性一样读取，但真正执行函数；#status 要求接收者持有本类的私有成员。
        return `${this.title} · ${this.#status}`;
    }
    set label(value) {
        // setter 只示范输入转换，并不表示“label”本身作为普通字段存储在实例上。
        this.title = value.trim();
    }
    get status() {
        return this.#status;
    }
    complete() {
        // 修改的是当前实例私有状态，不会影响另一个 Task 的 #status。
        this.#status = "已完成";
        return this.#status;
    }
    describe() {
        return `任务：${this.title}`;
    }
    // 箭头函数字段在每个实例上创建，捕获初始化时的实例 this。
    describeBound = () => this.describe();
    static create(title) {
        // 静态方法中的 this 是调用它的构造器；TimedTask.create 会使用派生类而不是写死 Task。
        return new this(title);
    }
}

export class TimedTask extends Task {
    constructor(title, minutes = 25) {
        super(title); // 派生构造函数在访问 this 前初始化实例。
        this.minutes = minutes;
    }
    describe() {
        // 重写改变行为；super.describe 保留父级的基础格式，方法查找沿原型发生而不是复制父方法。
        return `${super.describe()}，计划 ${this.minutes} 分钟`;
    }
}

// 传统构造函数对照片段：必须结合 new 使用才会把 title 写到新实例；普通函数不会自动变成类。
export function LegacyTask(title) {
    this.title = title;
}
// 赋给 prototype 后多个实例可共享这个函数；属性描述符与 class 方法的默认值存在差异。
LegacyTask.prototype.describe = function () {
    return `任务：${this.title}`;
};

// 继承标准 Error 保留错误分类语义，同时添加业务字段，便于按错误类型决定交互反馈。
export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = "ValidationError";
        this.field = field;
    }
}

/**
 * 通过参数组合行为，无须为每个输出样式建立子类。
 * task 是当前任务，formatter 是由调用方注入的函数，返回值完全由 formatter 决定。
 * 这里只展示组合思路，不承担通用输入校验或阻止回调修改 task 的职责。
 */
export function formatTask(task, formatter) {
    return formatter(task);
}
