import { basename } from "../tools/MiscUtils";

let R20Module = {};

R20Module.Base = class ModuleBase {
    constructor(filename) {
        this.filename = basename(filename);
        this.isDisposed = true;
    }

    installFirstTime() { }
    installUpdate() { }
    dispose() { }

    internalCanInstall() {
        const hook = this.getHook();

        if (!hook.config.enabled) return false;
        if (this.isDisposed) return true;

        console.error("Attempted to install module when it's not disposed.")
        console.table({
            "Module filename": this.filename
        });
        console.trace();
        return false;
    }

    internalInstallFirstTime() {
        if (!this.internalCanInstall()) return;
        try {
            this.installFirstTime();
        } catch (e) { console.error(e) }
        this.isDisposed = false;
    }

    internalInstallUpdate() {
        if (!this.internalCanInstall()) return;
        try {
            this.installUpdate();
        } catch (e) { console.error(e) }
        this.isDisposed = false;
    }

    internalDispose() {
        console.log(this);
        if (this.isDisposed) {
            console.error("internalDispose called on module that is already disposed!");
            console.table({
                "Module filename": this.filename
            });
            console.trace();
            return;
        }

        try {
            this.dispose()
        } catch (e) { console.error(e) }

        this.isDisposed = true;
    }

    getAllHooks = _ => window.r20es.hooks;
    getHook() {
        if (!("hooks") in window.r20es) return null;

        for (const hookId in window.r20es.hooks) {
            const hook = window.r20es.hooks[hookId];
            if (hook.filename && hook.filename === this.filename) {
                return hook;
            }

        }

        return null;
    }

    toggleEnabledState(_isEnabled) {
        const hook = this.getHook();

        const newState = (_isEnabled === undefined || _isEnabled === null)
            ? !hook.config.enabled
            : _isEnabled;

        if (hook.config.enabled && newState) return;

        const oldEnabled = hook.config.enabled;
        hook.config.enabled = newState;
        hook.saveConfig();

        if (oldEnabled && !newState) {
            console.log("disabling");
            // disable
            this.internalDispose();
        }
        else if (!oldEnabled && newState) {
            console.log("enabling");
            // enable
            this.internalInstallUpdate();
        }
    }

    install() {
        if (!("r20esInstalledModuleTable" in window)) return;
        if (!("r20esDisposeTable" in window)) return;

        console.log(`Installing module ID: ${this.filename}`);

        let isFirstRun = !(this.filename in window.r20esInstalledModuleTable);

        if (isFirstRun) {
            console.log(`First run`);
            this.internalInstallFirstTime();
        } else {

            if (this.filename in window.r20esDisposeTable) {
                // dispose
                console.log(`Disposing old`);
                try {
                    const disposeOld = window.r20esDisposeTable[this.filename];
                    disposeOld();
                } catch (err) {
                    console.error(`Failed to dispose but still continuing:`);
                    console.error(err);
                }
            }

            console.log(`Calling install update`);
            this.internalInstallUpdate();
        }

        window.r20esDisposeTable[this.filename] = () => { this.dispose(); }
        window.r20esInstalledModuleTable[this.filename] = this;

        console.log(`DONE! module ID: ${this.filename}`);
    }
}

R20Module.SimpleBase = class SimpleModuleBase extends R20Module.Base {
    installFirstTime() { this.setup() }
    installUpdate() { this.setup() }

    setup() { }
}

R20Module.OnAppLoadBase = class OnAppLoadModuleBase extends R20Module.Base {
    constructor(id) {
        super(id);

        this.setup = this.setup.bind(this);
    }

    installFirstTime() {
        if (window.r20es.isLoading) {
            window.r20es.onAppLoad.addEventListener(this.setup);
        } else {
            this.setup();
        }
    }

    setup() { }

    installUpdate() {
        this.installFirstTime();
    }

    dispose() {
        window.r20es.onAppLoad.removeEventListener(this.setup);
    }
}

R20Module.canInstall = _ => window.r20es && "canInstallModules" in window.r20es && window.r20es.canInstallModules;

R20Module.makeHook = function (filename, hook) {
    hook.filename = basename(filename);
    
    if(!("gmOnly" in hook)) {
        hook.gmOnly = false;
    }

    return hook;
}

R20Module.getModule = function (filename) {
    if (!("r20esInstalledModuleTable" in window)) return null;
    return window.r20esInstalledModuleTable[filename];
}

R20Module.category = {
    canvas: "Canvas",
    exportImport: "Exporting/Importing",
    initiative: "Initiative",
    token: "Token",
    journal: "Journal",
}

export { R20Module };
