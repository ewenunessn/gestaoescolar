package schools

import "time"

type AdministrationType string

const (
	AdministrationTypeMunicipal AdministrationType = "municipal"
	AdministrationTypeState     AdministrationType = "state"
	AdministrationTypeFederal   AdministrationType = "federal"
	AdministrationTypePrivate   AdministrationType = "private"
)

type School struct {
	ID                 int64               `json:"id"`
	Name               string              `json:"name"`
	Code               string              `json:"code"`
	Address            *string             `json:"address,omitempty"`
	City               string              `json:"city"`
	MapsAddress        *string             `json:"mapsAddress,omitempty"`
	Phone              *string             `json:"phone,omitempty"`
	Email              *string             `json:"email,omitempty"`
	ManagerName        *string             `json:"managerName,omitempty"`
	AdministrationType *AdministrationType `json:"administrationType,omitempty"`
	TotalStudents      int                 `json:"totalStudents"`
	Modalities         []string            `json:"modalities"`
	Active             bool                `json:"active"`
	CreatedAt          time.Time           `json:"createdAt"`
	UpdatedAt          time.Time           `json:"updatedAt"`
}

type CreateSchoolRequest struct {
	Name               string `json:"name"`
	Code               string `json:"code"`
	Address            string `json:"address"`
	City               string `json:"city"`
	MapsAddress        string `json:"mapsAddress"`
	Phone              string `json:"phone"`
	Email              string `json:"email"`
	ManagerName        string `json:"managerName"`
	AdministrationType string `json:"administrationType"`
	Active             *bool  `json:"active"`
}

type UpdateSchoolRequest struct {
	Name               *string `json:"name"`
	Code               *string `json:"code"`
	Address            *string `json:"address"`
	City               *string `json:"city"`
	MapsAddress        *string `json:"mapsAddress"`
	Phone              *string `json:"phone"`
	Email              *string `json:"email"`
	ManagerName        *string `json:"managerName"`
	AdministrationType *string `json:"administrationType"`
	Active             *bool   `json:"active"`
}

type CreateSchoolInput struct {
	Name               string
	Code               string
	Address            *string
	City               string
	MapsAddress        *string
	Phone              *string
	Email              *string
	ManagerName        *string
	AdministrationType *AdministrationType
	Active             bool
}

type UpdateSchoolInput struct {
	Name               *string
	Code               *string
	Address            *string
	City               *string
	MapsAddress        *string
	Phone              *string
	Email              *string
	ManagerName        *string
	AdministrationType *AdministrationType
	Active             *bool
}

func (i UpdateSchoolInput) IsEmpty() bool {
	return i.Name == nil &&
		i.Code == nil &&
		i.Address == nil &&
		i.City == nil &&
		i.MapsAddress == nil &&
		i.Phone == nil &&
		i.Email == nil &&
		i.ManagerName == nil &&
		i.AdministrationType == nil &&
		i.Active == nil
}

type ListSchoolsQuery struct {
	Active *bool
	Search string
	Limit  int
	Cursor *int64
}

type ListSchoolsResult struct {
	Schools    []School
	NextCursor *int64
}
