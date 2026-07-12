import Foundation
import Capacitor

/// Tiny iCloud key-value bridge for the save mirror.
/// NSUbiquitousKeyValueStore keeps a local copy too, so this doubles as
/// durable storage even before iCloud syncs (or without a signed-in account).
@objc(CloudKVPlugin)
public class CloudKVPlugin: CAPPlugin {
    @objc func get(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "hmsave"
        let store = NSUbiquitousKeyValueStore.default
        store.synchronize()
        call.resolve(["value": store.string(forKey: key) as Any])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let value = call.getString("value") else {
            call.reject("value required")
            return
        }
        let key = call.getString("key") ?? "hmsave"
        let store = NSUbiquitousKeyValueStore.default
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve()
    }
}
