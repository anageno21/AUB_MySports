import UIKit
import Speech
import AVFoundation

class ViewController: UIViewController, SFSpeechRecognizerDelegate {
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) // English
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    override func viewDidLoad() {
        super.viewDidLoad()

        let fontSizeTokens: CGFloat = 11
        let fontSizeBookNow: CGFloat = 14

        let buttonWidth: CGFloat = 120
        let buttonHeight: CGFloat = 40

        let xOffsets40SPR: [CGFloat] = [94, 94, 94, 94, 94]
        let xOffsets60SPR: [CGFloat] = [239, 239, 239, 239, 239]
        let yOffsets40SPR: [CGFloat] = [273, 357, 441, 525, 609]
        let yOffsets60SPR: [CGFloat] = [273, 357, 441, 525, 609]

        for index in 0..<5 {
            let button40 = createButton(title: "40 SPR token", bookNowTitle: "book now",
                                        x: xOffsets40SPR[index], y: yOffsets40SPR[index],
                                        fontSizeTokens: fontSizeTokens, fontSizeBookNow: fontSizeBookNow)
            self.view.addSubview(button40)

            let button60 = createButton(title: "60 SPR token", bookNowTitle: "book now",
                                        x: xOffsets60SPR[index], y: yOffsets60SPR[index],
                                        fontSizeTokens: fontSizeTokens, fontSizeBookNow: fontSizeBookNow)
            self.view.addSubview(button60)
        }

        // Add text field for input higher up to leave space for action icons below
        let textField = UITextField(frame: CGRect(x: 20, y: self.view.frame.height - 150, width: self.view.frame.width - 40, height: 70))
        textField.borderStyle = .roundedRect
        textField.layer.cornerRadius = 10.0
        textField.clipsToBounds = true
        textField.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        
        // Reduce font size for text and placeholder
        textField.font = UIFont.systemFont(ofSize: 14) // Reduced from default (around 17) to 14
        let placeholderAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14),
            .foregroundColor: UIColor.gray
        ]
        textField.attributedPlaceholder = NSAttributedString(
            string: "E.g. I want a padel court on Friday, March 8 at 13:00",
            attributes: placeholderAttributes
        )
        
        // Add microphone icon with further reduced size and padding
        let micButton = UIButton(type: .system)
        micButton.setImage(UIImage(systemName: "mic.fill"), for: .normal)
        micButton.frame = CGRect(x: 0, y: 0, width: 18, height: 18) // Reduced by 20% from 23x23 to 18x18
        micButton.tintColor = .gray
        
        // Add padding to the mic button
        let micContainer = UIView(frame: CGRect(x: 0, y: 0, width: 30, height: 18))
        micButton.frame.origin.x = 10 // Adds 10 points padding from the right edge
        micContainer.addSubview(micButton)
        
        micButton.addTarget(self, action: #selector(startRecording), for: .touchUpInside)
        textField.rightView = micContainer
        textField.rightViewMode = .always // Always show the mic icon
        
        self.view.addSubview(textField)

        // Request permission for speech recognition
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                if authStatus == .authorized {
                    print("Speech recognition enabled")
                } else {
                    print("Speech recognition rejected")
                }
            }
        }
    }

    func createButton(title: String, bookNowTitle: String, x: CGFloat, y: CGFloat, fontSizeTokens: CGFloat, fontSizeBookNow: CGFloat) -> UIButton {
        let button = UIButton(type: .system)
        let attributedText = NSMutableAttributedString(string: "\(title)\n", attributes: [
            .font: UIFont.systemFont(ofSize: fontSizeTokens, weight: .regular),
            .foregroundColor: UIColor(named: "#860033")
        ])
        let bookNowText = NSAttributedString(string: bookNowTitle, attributes: [
            .font: UIFont.systemFont(ofSize: fontSizeBookNow, weight: .bold),
            .foregroundColor: UIColor(named: "#F37021")
        ])
        attributedText.append(bookNowText)
        button.setAttributedTitle(attributedText, for: .normal)
        button.titleLabel?.textAlignment = .left
        button.titleLabel?.numberOfLines = 2
        button.frame = CGRect(x: x, y: y, width: 120, height: 40)
        button.addTarget(self, action: #selector(bookNowTapped), for: .touchUpInside)
        return button
    }

    @objc func bookNowTapped(_ sender: UIButton) {
        let slotId = "Aqua-11:30-12:30"
        checkAvailability(slotId: slotId) { available in
            DispatchQueue.main.async {
                if available {
                    self.payWithToken(amount: 40, slotId: slotId, account: "0x5eA4ef97D73bC4C424cC2a2d90482F36a2E3FAEA") { success in
                        if success {
                            print("🔥 Payment successful")
                        } else {
                            print("🔥 Payment failed")
                        }
                    }
                } else {
                    print("🔥 Slot is not available")
                }
            }
        }
    }

    func checkAvailability(slotId: String, completion: @escaping (Bool) -> Void) {
        let url = URL(string: "http://localhost:3000/availability/\(slotId)")!
        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                print("🔥 Error checking availability: \(error)")
                completion(false)
                return
            }
            guard let data = data else {
                completion(false)
                return
            }
            do {
                let json = try JSONDecoder().decode([String: Bool].self, from: data)
                completion(json["available"] ?? false)
            } catch {
                print("🔥 Error decoding JSON: \(error)")
                completion(false)
            }
        }.resume()
    }

    func payWithToken(amount: Int, slotId: String, account: String, completion: @escaping (Bool) -> Void) {
        let url = URL(string: "http://localhost:3000/book")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["slotId": slotId, "account": account, "amount": amount]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("🔥 Error paying with token: \(error)")
                completion(false)
                return
            }
            guard let data = data else {
                completion(false)
                return
            }
            do {
                let json = try JSONDecoder().decode([String: Bool].self, from: data)
                completion(json["success"] ?? false)
            } catch {
                print("🔥 Error decoding JSON: \(error)")
                completion(false)
            }
        }.resume()
    }

    @objc func startRecording() {
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
            print("Recording stopped")
            return
        }

        try? AVAudioSession.sharedInstance().setCategory(.record, mode: .measurement, options: .duckOthers)
        try? AVAudioSession.sharedInstance().setActive(true)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer, _) in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try? audioEngine.start()

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            if let result = result {
                print("Recognized: \(result.bestTranscription.formattedString)")
                if result.isFinal {
                    self.processVoiceCommand(result.bestTranscription.formattedString)
                    self.audioEngine.stop()
                    inputNode.removeTap(onBus: 0)
                    self.recognitionRequest = nil
                    self.recognitionTask = nil
                }
            }
        }
    }

    @objc func textFieldDidChange(_ textField: UITextField) {
        if let text = textField.text {
            processVoiceCommand(text)
        }
    }

    func processVoiceCommand(_ command: String) {
        print("Processing command: \(command)")
        if command.lowercased().contains("want") && (command.lowercased().contains("padel") || command.lowercased().contains("aqua")) {
            let components = command.lowercased().components(separatedBy: " ")
            
            // Search for the date (e.g. "March 8" or "8 March")
            var dateString: String?
            for (index, component) in components.enumerated() {
                if component.contains("march") {
                    if index > 0, let day = components[safe: index-1]?.filter("0123456789".contains),
                       let dayInt = Int(day), dayInt > 0 && dayInt <= 31 {
                        dateString = "\(day) \(component)"
                    } else if index < components.count - 1, let day = components[safe: index+1]?.filter("0123456789".contains),
                             let dayInt = Int(day), dayInt > 0 && dayInt <= 31 {
                        dateString = "\(day) \(component)"
                    }
                }
            }
            
            // Search for the time (e.g. "10:00" or "10pm")
            var timeMatch: String?
            for component in components {
                if component.contains(":") && component.count >= 4 && component.count <= 5 {
                    timeMatch = component
                } else if component.hasSuffix("pm") || component.hasSuffix("am") {
                    if let hour = Int(component.replacingOccurrences(of: "pm", with: "").replacingOccurrences(of: "am", with: "")),
                       hour >= 1 && hour <= 12 {
                        timeMatch = "\(hour):00"
                    }
                }
            }
            
            if let date = dateString, let time = timeMatch {
                let slotId = "Aqua-\(time)"
                checkAvailability(slotId: slotId) { available in
                    DispatchQueue.main.async {
                        if available {
                            print("🔥 Available slot: \(slotId)")
                            self.showAvailableSlot(slotId: slotId)
                        } else {
                            print("🔥 Slot is not available: \(slotId)")
                            let label = UILabel(frame: CGRect(x: 94, y: 180, width: 200, height: 40))
                            label.text = "Slot not available"
                            label.textColor = .red
                            self.view.addSubview(label)
                        }
                    }
                }
            } else {
                print("🔥 Could not parse date or time: date=\(dateString ?? "nil"), time=\(timeMatch ?? "nil")")
            }
        } else {
            print("🔥 Invalid command format")
        }
    }

    func showAvailableSlot(slotId: String) {
        print("🔥 Attempting to show available slot: \(slotId)")
        // Remove existing button if it exists
        for subview in self.view.subviews where subview is UIButton {
            if subview.frame.origin.y == 180 {
                subview.removeFromSuperview()
                print("🔥 Removed existing button at y=180")
            }
        }
        let button = UIButton(type: .system)
        let attributedText = NSMutableAttributedString(string: "40 SPR token\n", attributes: [
            .font: UIFont.systemFont(ofSize: 11, weight: .regular),
            .foregroundColor: UIColor(named: "#860033")
        ])
        let bookNowText = NSAttributedString(string: "book now", attributes: [
            .font: UIFont.systemFont(ofSize: 14, weight: .bold),
            .foregroundColor: UIColor(named: "#F37021")
        ])
        attributedText.append(bookNowText)
        button.setAttributedTitle(attributedText, for: .normal)
        button.titleLabel?.textAlignment = .left
        button.titleLabel?.numberOfLines = 2
        button.frame = CGRect(x: 94, y: 180, width: 120, height: 40)
        button.backgroundColor = .lightGray
        button.addTarget(self, action: #selector(bookNowTapped), for: .touchUpInside)
        self.view.addSubview(button)
        button.bringSubviewToFront(self.view)
        print("🔥 Added new button at y=180")
        self.view.setNeedsLayout()
        self.view.layoutIfNeeded()
    }
}

// Extension for safe array indexing
extension Collection {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}

extension UIColor {
    convenience init(named: String) {
        var hexSanitized = named.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let red = CGFloat((rgb >> 16) & 0xFF) / 255.0
        let green = CGFloat((rgb >> 8) & 0xFF) / 255.0
        let blue = CGFloat(rgb & 0xFF) / 255.0

        self.init(red: red, green: green, blue: blue, alpha: 1.0)
    }
}
