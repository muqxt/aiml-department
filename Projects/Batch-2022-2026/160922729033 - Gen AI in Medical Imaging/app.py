import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
from flask import Flask, render_template, request, send_from_directory

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- Transform ----------------
transform = transforms.Compose([
    transforms.Resize((150, 150)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ---------------- Model ----------------
class YourModelClass(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 32, 3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, 3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self._to_linear = self._get_conv_output_size()
        self.fc1 = nn.Linear(self._to_linear, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def _get_conv_output_size(self):
        x = torch.zeros(1, 3, 150, 150)
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        return torch.flatten(x, 1).size(1)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        return self.fc2(x)

# ---------------- Load Model ----------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
class_names=["adenocarcinoma","glioma_tumor","large.cell.carcinoma","meningioma_tumor","no_tumor","normal_lung","pituitary_tumor","squamous.cell.carcinoma"]

model = YourModelClass(len(class_names))
model.load_state_dict(torch.load("classifier.pth", map_location=device))
model.to(device)
model.eval()

def predict_image(image_path):
    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        _, pred = torch.max(outputs, 1)

    return class_names[pred.item()]

# ---------------- Routes ----------------
@app.route("/", methods=["GET", "POST"])
def index():
    prediction = None
    filename = None

    if request.method == "POST":
        file = request.files["image"]
        if file:
            filename = file.filename
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(file_path)
            prediction = predict_image(file_path)

    return render_template("index.html",
                           prediction=prediction,
                           filename=filename)

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

if __name__ == "__main__":
    app.run(debug=True)
