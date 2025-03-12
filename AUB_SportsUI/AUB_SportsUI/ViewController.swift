import UIKit

class ViewController: UIViewController {

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
