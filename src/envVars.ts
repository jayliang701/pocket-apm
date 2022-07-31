import { Vars } from "./lib/types";

class EnvVars extends Map<string, string | number | boolean> {
    toVars(): Vars {
        const vars: Vars = {};
        this.forEach((val, key) => {
            vars[key] = val;
        });
        return vars;
    }

    setVars(vars: Vars) {
        for (let key in vars) {
            const val = vars[key];
            if (val === null || val === undefined) {
                this.delete(key);
            } else {
                this.set(key, val);
            }
        }
    }
}

const envVars: EnvVars = new EnvVars();

export default envVars;
