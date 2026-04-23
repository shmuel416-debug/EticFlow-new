variable "location" {
  description = "Azure region."
  type        = string
  default     = "westeurope"
}

variable "project_name" {
  description = "Project slug used in resource names."
  type        = string
  default     = "eticflow"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "prod"
}

variable "admin_username" {
  description = "Linux VM admin username."
  type        = string
  default     = "azureuser"
}

variable "admin_ssh_public_key" {
  description = "SSH public key content."
  type        = string
}

variable "vm_size" {
  description = "Azure VM SKU."
  type        = string
  default     = "Standard_B2s"
}

variable "ssh_allowed_cidrs" {
  description = "Allowed CIDR blocks for inbound SSH access."
  type        = list(string)
}
