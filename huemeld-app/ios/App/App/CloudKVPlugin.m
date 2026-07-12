#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the plugin with Capacitor as window.Capacitor.Plugins.CloudKV
CAP_PLUGIN(CloudKVPlugin, "CloudKV",
  CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
)
