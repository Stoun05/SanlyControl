use std::{
    fs::{self, File},
    net::TcpStream,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

const SERVER_PORT: u16 = 34821;

pub fn run() {
    let server = Arc::new(Mutex::new(None::<Child>));
    let setup_server = Arc::clone(&server);

    let app = tauri::Builder::default()
        .setup(move |app| {
            let resource_dir = app.path().resource_dir()?;
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;

            let node_path = resource_dir.join("node.exe");
            let app_dir = resource_dir.join("app");
            let stdout = File::create(data_dir.join("sanlycontrol.log"))?;
            let stderr = stdout.try_clone()?;
            let mut command = Command::new(node_path);
            command
                .arg("main.js")
                .current_dir(app_dir)
                .env("PORT", SERVER_PORT.to_string())
                .env("SANLYCONTROL_DATA_DIR", &data_dir)
                .stdout(Stdio::from(stdout))
                .stderr(Stdio::from(stderr));
            #[cfg(windows)]
            command.creation_flags(0x08000000);

            let child = command.spawn()?;
            *setup_server.lock().expect("hyzmat gulpy") = Some(child);

            for _ in 0..80 {
                if TcpStream::connect(("127.0.0.1", SERVER_PORT)).is_ok() {
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }

            let url = format!("http://127.0.0.1:{SERVER_PORT}").parse()?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("SanlyControl")
                .inner_size(1440.0, 920.0)
                .min_inner_size(960.0, 640.0)
                .resizable(true)
                .center()
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("SanlyControl açylmady");

    app.run(move |_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            if let Some(mut child) = server.lock().expect("hyzmat gulpy").take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    });
}
