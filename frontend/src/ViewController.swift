import UIKit
import Speech

class ViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate, SFSpeechRecognizerDelegate {
    // UI Elements (created programmatically)
    private var queryTextField: UITextField!
    private var tableView: UITableView!

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    // List to store entered texts
    private var enteredTexts: [String] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        // Set background color to #f9f7ee
        view.backgroundColor = UIColor(hex: "#f9f7ee")

        // Initialize and setup TextField
        queryTextField = UITextField()
        queryTextField.translatesAutoresizingMaskIntoConstraints = false
        queryTextField.placeholder = "Enter text here"
        queryTextField.backgroundColor = .white
        queryTextField.layer.borderColor = UIColor(hex: "#b3b3b3").cgColor
        queryTextField.layer.borderWidth = 1.0
        queryTextField.layer.cornerRadius = 15.0
        queryTextField.clipsToBounds = false // Allow shadow
        queryTextField.textColor = UIColor(hex: "#b3b3b3")
        queryTextField.textAlignment = .left
        queryTextField.contentVerticalAlignment = .top
        queryTextField.font = UIFont.systemFont(ofSize: 16)
        queryTextField.delegate = self

        // Add shadow to TextField
        queryTextField.layer.shadowColor = UIColor.black.cgColor
        queryTextField.layer.shadowOpacity = 0.1
        queryTextField.layer.shadowOffset = CGSize(width: 0, height: 2)
        queryTextField.layer.shadowRadius = 2

        // Set placeholder text color and alignment
        queryTextField.attributedPlaceholder = NSAttributedString(
            string: "Enter text here",
            attributes: [
                NSAttributedString.Key.foregroundColor: UIColor(hex: "#b3b3b3").withAlphaComponent(0.5),
                NSAttributedString.Key.baselineOffset: 5
            ]
        )

        // Setup microphone button, submit arrow, and clear (X) button inside the TextField
        let micButton = UIButton(type: .system)
        micButton.setImage(UIImage(systemName: "mic"), for: .normal) // Outline style
        micButton.tintColor = UIColor(hex: "#333333")
        micButton.frame = CGRect(x: 5, y: 22.5, width: 37.5, height: 37.5)
        micButton.addTarget(self, action: #selector(startVoiceRecognition), for: .touchUpInside)

        let submitButton = UIButton(type: .system)
        submitButton.setImage(UIImage(systemName: "arrow.up"), for: .normal) // Outline style
        submitButton.tintColor = UIColor(hex: "#333333")
        submitButton.frame = CGRect(x: 47.5, y: 22.5, width: 37.5, height: 37.5)
        submitButton.addTarget(self, action: #selector(submitText), for: .touchUpInside)
        submitButton.transform = CGAffineTransform(rotationAngle: -.pi / 2)

        let clearButton = UIButton(type: .system)
        clearButton.setImage(UIImage(systemName: "xmark"), for: .normal) // Outline style
        clearButton.tintColor = UIColor(hex: "#333333")
        clearButton.frame = CGRect(x: 90, y: 22.5, width: 37.5, height: 37.5)
        clearButton.addTarget(self, action: #selector(clearAllTexts), for: .touchUpInside)
        clearButton.transform = CGAffineTransform(rotationAngle: -.pi / 2)

        // Verify button actions are set
        if submitButton.allTargets.isEmpty || clearButton.allTargets.isEmpty {
            print("Warning: Button action not set!")
        } else {
            print("Submit button action is set to: \(submitButton.allTargets)")
            print("Clear button action is set to: \(clearButton.allTargets)")
        }

        // Create a container view for the three buttons
        let rightPaddingView = UIView(frame: CGRect(x: 0, y: 0, width: 132.5, height: 75)) // Adjusted width for larger buttons
        rightPaddingView.addSubview(micButton)
        rightPaddingView.addSubview(submitButton)
        rightPaddingView.addSubview(clearButton)
        queryTextField.rightView = rightPaddingView
        queryTextField.rightViewMode = .always

        // Add TextField to view
        view.addSubview(queryTextField)

        // Set constraints for TextField (moved to bottom)
        NSLayoutConstraint.activate([
            queryTextField.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
            queryTextField.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            queryTextField.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20), // Moved to bottom
            queryTextField.heightAnchor.constraint(equalToConstant: 75)
        ])

        // Initialize and setup TableView
        tableView = UITableView()
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        tableView.backgroundColor = .clear // Explicitly set to clear
        tableView.isOpaque = false // Ensure transparency
        tableView.backgroundView = nil // Remove any default background
        tableView.layer.cornerRadius = 8.0
        tableView.clipsToBounds = true

        // Add TableView to view
        view.addSubview(tableView)

        // Set constraints for TableView (from top to just above TextField)
        NSLayoutConstraint.activate([
            tableView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
            tableView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            tableView.bottomAnchor.constraint(equalTo: queryTextField.topAnchor, constant: -10) // Ends just above TextField
        ])

        // Request speech recognition permission
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

    // Submit button action
    @objc func submitText() {
        print("Submit button pressed")
        guard let text = queryTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            print("Text is empty, not adding to table.")
            return
        }
        enteredTexts.append(text)
        queryTextField.text = "" // Clear the TextField
        tableView.reloadData() // Ensure tableView updates
        print("Added text: \(text), Total items: \(enteredTexts.count)")
        print("Current enteredTexts: \(enteredTexts)")
        UIView.transition(with: tableView, duration: 0.3, options: .transitionCrossDissolve, animations: {
            self.tableView.reloadData()
        }, completion: nil)
    }

    // Clear button action
    @objc func clearAllTexts() {
        print("Clear button pressed")
        enteredTexts.removeAll()
        queryTextField.text = "" // Clear the TextField
        tableView.reloadData()
        print("Cleared all texts.")
        UIView.transition(with: tableView, duration: 0.3, options: .transitionCrossDissolve, animations: {
            self.tableView.reloadData()
        }, completion: nil)
    }

    // UITextFieldDelegate Method
    func textFieldDidChangeSelection(_ textField: UITextField) {
        if let text = textField.text {
            print("User entered: \(text)")
        }
    }

    // UITableViewDataSource Methods
    func numberOfSections(in tableView: UITableView) -> Int {
        print("Number of sections: 1")
        return 1 // Ensure a single section
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        print("Number of rows in section \(section): \(enteredTexts.count)")
        return enteredTexts.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        if indexPath.row < enteredTexts.count {
            cell.textLabel?.text = enteredTexts[indexPath.row]
            print("Cell for row \(indexPath.row): \(enteredTexts[indexPath.row])")
        } else {
            print("Index out of bounds: \(indexPath.row) vs \(enteredTexts.count)")
        }
        cell.textLabel?.textAlignment = .center
        cell.textLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        cell.textLabel?.textColor = UIColor(hex: "#333333") // Dark gray text color
        cell.backgroundColor = .clear // Make cell background transparent
        cell.contentView.backgroundColor = .clear // Ensure content view is transparent
        return cell
    }

    // UITableViewDelegate Method for Header
    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let headerView = UIView()
        headerView.backgroundColor = .clear // Make header transparent

        let label = UILabel()
        label.text = "Recent Entries"
        label.textColor = UIColor(hex: "#333333")
        label.font = UIFont.boldSystemFont(ofSize: 20)
        label.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(label)

        // Center the label in the header view
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: headerView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: headerView.centerYAnchor)
        ])

        return headerView
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        return 40
    }

    // Enable swipe-to-delete
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            enteredTexts.remove(at: indexPath.row)
            tableView.deleteRows(at: [indexPath], with: .left)
            UIView.transition(with: tableView, duration: 0.3, options: .transitionCrossDissolve, animations: {
                self.tableView.reloadData()
            }, completion: nil)
        }
    }

    // SFSpeechRecognizerDelegate Method
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        print("Speech recognition availability: \(available)")
    }

    // Action for Voice Recognition
    @objc func startVoiceRecognition(_ sender: UIButton) {
        print("Microphone button pressed")
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
            print("Voice recognition stopped")
        } else {
            try? startRecording()
        }
    }

    private func startRecording() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer, _) in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            if let result = result {
                DispatchQueue.main.async {
                    self.queryTextField.text = result.bestTranscription.formattedString
                    if result.isFinal {
                        self.audioEngine.stop()
                        inputNode.removeTap(onBus: 0)
                        self.recognitionRequest = nil
                        self.recognitionTask = nil
                    }
                }
            }
        }
        print("Voice recognition started")
    }
}

// Extension to handle hex color
extension UIColor {
    convenience init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHex antwortInt64(&rgb)

        let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let blue = CGFloat(rgb & 0x0000FF) / 255.0

        self.init(red: red, green: green, blue: blue, alpha: 1.0)
    }
}

// Extension to add text insets to UITextField
extension UITextField {
    private var padding: UIEdgeInsets {
        get { return UIEdgeInsets(top: 30, left: 35, bottom: 0, right: 0) } // Increased top to 30pt, left to 35pt
    }

    public func textRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }

    public func editingRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }

    public func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }
}
