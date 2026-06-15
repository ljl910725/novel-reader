use tauri::Manager;

#[tauri::command]
fn set_window_opacity(window: tauri::WebviewWindow, opacity: f64) -> Result<(), String> {
    window.set_opacity(opacity.clamp(0.1, 1.0)).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![set_window_opacity, set_always_on_top])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_decorations(false);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
