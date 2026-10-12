/** 记一条检查：ok 为 false 时把 message 记为失败。 */
export type Check = (ok: boolean, message: string) => void;
